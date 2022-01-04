import { formatDate } from 'src/lib';
import { Table, Button } from 'antd';
import { IPerformer } from 'src/interfaces';
import React from 'react';

interface IProps {
  data: IPerformer[];
  searching: boolean;
  // pagination?: any;
  pageSize: number;
  total: number;
  update: Function;
  onChange(pagination, filters, sorter, extra): Function;
}

const StudioCommissionsTable = ({
  data,
  searching,
  total,
  pageSize,
  update,
  onChange
}: IProps) => {
  const columns = [
    {
      title: 'Username',
      key: 'username',
      dataIndex: 'username'
    },
    {
      title: 'Commission',
      key: 'commission',
      dataIndex: 'commissionSetting',
      render(commissionSetting) {
        const { memberCommission } = commissionSetting;
        return (
          <span>
            {memberCommission}
            %
          </span>
        );
      }
    },
    {
      title: 'Created At',
      key: 'studioCommission',
      dataIndex: 'createdAt',
      render(createdAt: Date) {
        return <span>{formatDate(createdAt)}</span>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      dataIndex: '_id',
      render: (_id: string) => (
        <Button type="primary" onClick={() => update(_id)}>
          Update
        </Button>
      )
    }
  ];
  const dataSource = data.map((d) => ({ ...d, key: d._id }));
  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      loading={searching}
      pagination={{ pageSize, total }}
      onChange={onChange}
      scroll={{ x: true }}
    />
  );
};

export default StudioCommissionsTable;
