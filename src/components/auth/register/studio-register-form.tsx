import * as React from 'react';
import {
  Form, Input, Button, Select, Alert, Upload
} from 'antd';
import { ICountries } from 'src/interfaces';
import { connect } from 'react-redux';
import { updateUIValue } from 'src/redux/ui/actions';
import { getResponseError } from '@lib/utils';
import { UploadOutlined } from '@ant-design/icons';
import Link from 'next/link';

interface IProps {
  onFinish(value: any): Function;
  submiting?: boolean;
  countries: ICountries[];
  error: boolean;
  errorMessage: any;
  singularTextModel?: string;
}

const StudioRegisterForm = ({
  onFinish,
  submiting,
  countries,
  error,
  errorMessage,
  singularTextModel
}: IProps) => {
  const [documentVerification, setDocumentVerification] = React.useState('');
  const [form] = Form.useForm();
  return (
    <Form
      layout="vertical"
      form={form}
      onFinish={onFinish}
      name="studioRegisterForm"
      initialValues={{ country: undefined, gender: 'male' }}
    >
      <h1>Studio register</h1>
      <Form.Item
        name="firstName"
        rules={[
          {
            pattern: new RegExp('^[a-zA-Z0-9 ]*$'),
            message: 'Alphanumeric'
          },
          {
            whitespace: true,
            message: 'Please input your first name!'
          }
        ]}
      >
        <Input placeholder="First Name" />
      </Form.Item>
      <Form.Item
        name="lastName"
        rules={[
          {
            pattern: new RegExp('^[a-zA-Z0-9 ]*$'),
            message: 'Alphanumeric'
          },
          {
            whitespace: true,
            message: 'Please input your last name!'
          }
        ]}
      >
        <Input placeholder="Last Name" />
      </Form.Item>
      <Form.Item
        name="name"
        rules={[
          {
            required: true,
            message: 'Please input your studio name!'
          },
          {
            pattern: new RegExp('^[a-zA-Z0-9 ]*$'),
            message: 'Alphanumeric'
          },
          {
            whitespace: true,
            message: 'Please input your studio name!'
          }
        ]}
      >
        <Input placeholder="Studio Name" />
      </Form.Item>
      <Form.Item
        name="username"
        rules={[
          {
            required: true,
            message: 'Username is required!'
          },
          {
            pattern: new RegExp('^[a-zA-Z0-9]*$'),
            message: 'Dont allow special chars or space'
          }
        ]}
      >
        <Input placeholder="Username" />
      </Form.Item>
      <Form.Item
        name="email"
        rules={[
          {
            type: 'email',
            message: 'The input is not valid E-mail!'
          },
          {
            required: true,
            message: 'Please input your E-mail!'
          }
        ]}
      >
        <Input placeholder="E-mail" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[
          {
            required: true,
            message: 'Please input your password!'
          },
          {
            min: 6,
            max: 14,
            message: 'Passoword should be 6-14 characters'
          }
        ]}
        hasFeedback
      >
        <Input.Password placeholder="Password" />
      </Form.Item>
      <Form.Item
        name="confirm"
        dependencies={['password']}
        hasFeedback
        rules={[
          {
            required: true,
            message: 'Please confirm your password!'
          },
          ({ getFieldValue }) => ({
            validator(rule, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }

              return Promise.reject(
                new Error('The two passwords that you entered do not match!')
              );
            }
          })
        ]}
      >
        <Input.Password placeholder="Confirm Password" />
      </Form.Item>
      <Form.Item
        name="country"
        rules={[{ required: true, message: 'Please input your country!' }]}
      >
        <Select showSearch placeholder="Country">
          {countries.length > 0
            && countries.map((country) => (
              <Select.Option value={country.name} key={country.code}>
                {country.name}
              </Select.Option>
            ))}
        </Select>
      </Form.Item>
      <Form.Item
        name="documentVerification"
        rules={[
          {
            required: true,
            message: 'Verification document is required!'
          }
        ]}
      >
        <Upload
          showUploadList={false}
          customRequest={() => true}
          fileList={[]}
          onChange={(files) => setDocumentVerification(files.file.name)}
        >
          <Button>
            <UploadOutlined />
            {' '}
            Upload Document For Verification
          </Button>
          {documentVerification && (
            <span className="file-name">{documentVerification}</span>
          )}
        </Upload>
      </Form.Item>
      {error && (
        <Form.Item>
          <Alert
            description={getResponseError(errorMessage)}
            type="error"
            message="Error"
          />
        </Form.Item>
      )}
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={submiting}
          disabled={submiting}
          className="btn-submit"
        >
          Register new account
        </Button>
      </Form.Item>
      <Form.Item>
        Want to be a Member?
        {' '}
        <Link href="/auth/register/user">
          <a>Signup here</a>
        </Link>
      </Form.Item>
      <Form.Item>
        Are you a
        {' '}
        {singularTextModel || 'Performer'}
        ?
        {' '}
        <Link href="/auth/login/performer">
          <a>Login here</a>
        </Link>
      </Form.Item>
      <Form.Item>
        Are you a studio?
        {' '}
        <Link href="/studio/login">
          <a>Login here</a>
        </Link>
      </Form.Item>
    </Form>
  );
};
StudioRegisterForm.defaultProps = {
  submiting: false,
  singularTextModel: ''
};
const mapStateToProps = (state) => ({
  ...state.ui
});
const mapDispatchs = { updateUIValue };
export default connect(mapStateToProps, mapDispatchs)(StudioRegisterForm);
