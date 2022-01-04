import React from 'react';
import {
  Form, Input, Button, Checkbox
} from 'antd';
import { FormItemProps } from 'antd/lib/form/FormItem';
import FormInputItem from '@components/common/base/input-item-list';
import { formItemLayout, tailFormItemLayout } from 'src/lib';

const leftFormItem: FormItemProps[] = [
  // {
  //   name: 'suspendReason',
  //   rules: [
  //     { required: true, message: 'The suspension reason is requried' },
  //     { max: 250, message: 'Max 250 words' }
  //   ],
  //   label: 'Suspension Reason',
  //   children: <Input.TextArea />
  // },
  {
    name: 'password',
    rules: [{ required: true, message: 'Password is requried' }],
    label: 'Enter your password',
    children: <Input.Password placeholder="Password" />
  },
  {
    name: 'confirmation',
    valuePropName: 'checked',
    rules: [{ required: true, message: 'The confirmation is requried' }],
    children: <Checkbox>I am sure that i want to suspend my account.</Checkbox>
  }
];

interface IProps {
  onFinish(data): Function;
  loading: boolean;
}

export default ({ loading, onFinish }: IProps) => {
  const [form] = Form.useForm();

  return (
    <Form
      {...formItemLayout}
      form={form}
      layout="vertical"
      onFinish={onFinish.bind(this)}
      name="disableAccountForm"
      className="performerEditForm"
    >
      <FormInputItem fields={leftFormItem} />
      <Form.Item {...tailFormItemLayout}>
        <Button type="primary" htmlType="submit" loading={loading}>
          Save Change
        </Button>
      </Form.Item>
    </Form>
  );
};
